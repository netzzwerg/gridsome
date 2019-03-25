const { print, Kind } = require('graphql')
const parsePageQuery = require('../page-query')
const { PER_PAGE } = require('../../utils/constants')

test('parsed page-query', () => {
  const query = `query {
    allTestAuthors {
      edges {
        node {
          id
        }
      }
    }
  }`

  const parsed = parsePageQuery(query)

  expect(parsed.document.kind).toEqual(Kind.DOCUMENT)
  expect(parsed.source).toEqual(query)
  expect(parsed.paginate).toBeNull()
  expect(parsed.context).toMatchObject({})
  expect(parsed.filters).toMatchObject({})
})

test('parse @paginate directive for connection', () => {
  const parsed = parsePageQuery(`query {
    allTestAuthors {
      edges {
        node {
          id
        }
      }
    }
    pages: allTestPost @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  expect(parsed.paginate.typeName).toEqual('TestPost')
  expect(parsed.paginate.fieldName).toEqual('allTestPost')
  expect(parsed.paginate.perPage).toEqual(PER_PAGE)
  expect(parsed.paginate.belongsTo).toEqual(false)
})

test('parse @paginate with perPage variable', () => {
  const parsed = parsePageQuery(`query ($num: Int) {
    allTestPost (perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    num: 2
  })

  expect(parsed.paginate.perPage).toEqual(2)
})

test('parse @paginate with perPage variable from node field', () => {
  const parsed = parsePageQuery(`query ($num: Int) {
    allTestPost (perPage: $num) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    $loki: 1,
    fields: {
      num: 2
    }
  })

  expect(parsed.paginate.perPage).toEqual(2)
})

test('parse @paginate directive from belongsTo field', () => {
  const parsed = parsePageQuery(`query {
    testPage {
      belongsTo (perPage: 5) @paginate {
        edges {
          node {
            id
          }
        }
      }
    }
  }`)

  expect(parsed.paginate.typeName).toEqual('TestPage')
  expect(parsed.paginate.fieldName).toEqual('testPage')
  expect(parsed.paginate.belongsTo).toEqual(true)
  expect(parsed.paginate.perPage).toEqual(5)
})

test('parse filters from @paginate', () => {
  const parsed = parsePageQuery(`query ($customVar: String) {
    pages: allTestPost (
      filter: {
        myField: { eq: $customVar }
        num: { gt: 2 }
      }
    ) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    customVar: 'custom var'
  })

  expect(parsed.filters).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('parse filters from @paginate with variable from node field', () => {
  const parsed = parsePageQuery(`query ($customVar: String) {
    pages: allTestPost (
      filter: {
        myField: { eq: $customVar }
        num: { gt: 2 }
      }
    ) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`, {
    $loki: 1,
    fields: {
      customVar: 'custom var'
    }
  })

  expect(parsed.filters).toMatchObject({
    myField: { eq: 'custom var' },
    num: { gt: 2 }
  })
})

test('remove @paginate directive from ast', () => {
  const parsed = parsePageQuery(`query {
    allTestAuthors (perPage: 5) @paginate {
      edges {
        node {
          id
        }
      }
    }
  }`)

  expect(print(parsed.document)).not.toMatch('@paginate')
})

test('parse empty page-query', () => {
  const parsed = parsePageQuery('  \n  ')

  expect(parsed.document).toBeNull()
})

test('parse invalid page-query', () => {
  const parsed = parsePageQuery('..')
  expect(parsed.document).toBeNull()
})

test('parse page-query with context', () => {
  const { context } = parsePageQuery(`query (
    $page: Int
    $path: String
    $id: String
    $title: String
    $custom: String
    $deep__value: String
    $list__1__value: Int
    $ref: String
    $refs__1: String
  ) {
    testAuthor {
      id
    }
  }`, {
    $loki: 1,
    id: '1',
    title: 'title',
    fields: {
      custom: 'custom value',
      deep: {
        value: 'deep value'
      },
      list: [{ value: 1 }, { value: 2 }, { value: 3 }],
      ref: { typeName: 'Post', id: '1' },
      refs: [
        { typeName: 'Post', id: '1' },
        { typeName: 'Post', id: '2' }
      ]
    }
  })

  expect(context.id).toEqual('1')
  expect(context.title).toEqual('title')
  expect(context.custom).toEqual('custom value')
  expect(context.deep__value).toEqual('deep value')
  expect(context.list__1__value).toEqual(2)
  expect(context.ref).toEqual('1')
  expect(context.refs__1).toEqual('2')
})
